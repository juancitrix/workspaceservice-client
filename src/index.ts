import { get, post } from "needle";
import { ConnectionResponse } from './connection-response';

export const Greeter = (name: string) => `Hello ${name}`;

async function getResourceList(host: string): Promise<object> {

    return new Promise<object>( (resolve, reject) => {

        const url = `https://${host}/Citrix/StoreWeb/Resources/List`;

        const options = {
            cookies: {},
            headers: {
                'Accept': 'application/json',
                'Csrf-Token': '',
                'X-Citrix-IsUsingHTTPS': 'yes',
                'X-Requested-With': 'XMLHttpRequest',
                'host': host,
            },
        };

        post(url, '{"resourceDetails":"Full"}', options, (error: any, response: any) => {

            if (error != null) {
                reject(error)
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else if (response.body !== '{"unauthorized": true}') {
                reject('Invalid response: ' + response.body);
            } else {
                // Check header CitrixWebReceiver-Authenticate →reason="notoken", location="Authentication/GetAuthMethods"

                const aspNet = 'ASP.NET_SessionId';
                const csrfToken = 'CsrfToken';
                const ctxsDeviceId = 'CtxsDeviceId';
                options.headers['Csrf-Token'] = response.cookies[csrfToken];

                options.cookies = {
                    'ASP.NET_SessionId': response.cookies[aspNet],
                    'CsrfToken': response.cookies[csrfToken],
                    'CtxsDeviceId' : response.cookies[ctxsDeviceId],
                };

                resolve(options);
            }
        });
    });
}

async function getAuthMethods(host: string, options: any): Promise<void> {

    return new Promise<void>( (resolve, reject) => {

        const url = `https://${host}/Citrix/StoreWeb/Authentication/GetAuthMethods`;

        post(url, '', options, (error: any, response: any) => {

            if (error !== null) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else if (response.statusMessage !== 'OK') {
                reject(response.statusMessage);
            } else if (response.body.children[0].attributes.name !== 'ExplicitForms') {
                reject('Server does not support explicit forms');
            } else if (response.body.children[0].attributes.url !== '/ExplicitAuth/Login') {
                reject('Server does not support /ExplicitAuth/Login');
            }
            else {
                resolve();
            }
        });
    });
}

async function getExplicitLogin(host: string, options: any): Promise<void> {

    return new Promise<void>( (resolve, reject) => {

        const url = `http://${host}/Citrix/StoreWeb/ExplicitAuth/Login`;

        post(url, '', options, (error: any, response: any) => {

            if (error !== null) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else if (response.statusMessage !== 'OK') {
                reject(response.statusMessage);
            } else if (response.body.children[0].name !== 'Result') {
                reject('Did not get proper resonse');
            } else if (response.body.children[0].value === 'Fail') {
                reject('Request failed');
            } else {
                resolve();
            }
        });
    });
}

async function loginAttempt(username: string, password: string, host: string, options: any): Promise<void> {

    return new Promise<void>( (resolve, reject) => {

        const url = `http://${host}/Citrix/StoreWeb/ExplicitAuth/LoginAttempt`;

        const body = `username=${username}&password=${password}&saveCredentials=false&loginBtn=Log%2BOn&StateContext=undefined`;

        options.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Csrf-Token': options.headers['Csrf-Token'],
            'X-Citrix-AM-CredentialTypes': 'none, username, domain, password, newpassword, passcode, savecredentials, textcredential, webview',
            'X-Citrix-AM-LabelTypes': 'none, plain, heading, information, warning, error, confirmation, image',
            'X-Citrix-IsUsingHTTPS': 'yes',
            'X-Requested-With': 'XMLHttpRequest',
            'host': host,
        };

        post(url, body, options, (error: any, response: any) => {

            const ctxsAuthId = 'CtxsAuthId';

            if (error != null) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else if (response.statusMessage !== 'OK') {
                reject(response.statusMessage);
            } else if (response.body.children[0].name !== 'Result') {
                reject('Did not get proper resonse');
            } else if (response.body.children[0].value !== 'success') {
                reject('Request failed');
            } else if (response.cookies[ctxsAuthId] === null) {
                reject(`Missing ${ctxsAuthId} from response`);
            } else {
                resolve();
            }

            options.cookies[ctxsAuthId] = response.cookies[ctxsAuthId];

            resolve();

        });

    });
}

async function getLaunchUrl(host: string, options: any): Promise<string> {

    return new Promise<string>( (resolve, reject) => {

        const url = `https://${host}/Citrix/StoreWeb/Resources/List`;

        options.headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json;charset=utf-8',
            'Csrf-Token': options.headers['Csrf-Token'],
            'X-Citrix-IsUsingHTTPS': 'yes',
            'X-Requested-With': 'XMLHttpRequest',
            'host': host,
        };

        post(url, '{"resourceDetails":"Full"}', options, (error: any, response: any) => {

            if (error !== null) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else if (response.statusMessage !== 'OK') {
                reject(response.statusMessage);
            } else if (response.body.children[0].attributes.name !== 'ExplicitForms') {
                reject('Did not get proper resonse');
            } else if (response.body.children[0].attributes.url !== '/ExplicitAuth/Login') {
                reject('Request failed');
            } else {
                const launchUrl: string = getLaunchUrlFromResponse(response.body);

                resolve(launchUrl);
            }
        });

    });
}

async function getICAFile(launchUrl: string, host: string, options: any): Promise<string> {

    return new Promise<string>( (resolve, reject) => {

        const url = `https://${host}/Citrix/StoreWeb/${launchUrl}`;

        get(url, options, (error: any, response: any) => {

            if (error !== null) {
                reject(error);
            } else if (response.statusCode !== 200) {
                reject(response.statusCode);
            } else if (response.statusMessage !== 'OK') {
                reject(response.statusMessage);
            } else {
                resolve(response.body.toString());
            }

        });

    });
}

export async function getPrimaryDesktopConnection(username: string, password: string, host: string): Promise<ConnectionResponse> {

    try {

        const options = await getResourceList(host);
        await getAuthMethods(host, options);
        await getExplicitLogin(host, options);
        await loginAttempt(username, password, host, options);
        const launchUrl: string  = await getLaunchUrl(host, options);

        const result: ConnectionResponse = new ConnectionResponse();

        result.icaFile = await getICAFile(launchUrl, host, options);
        result.code = 200;
        result.message = 'success';

        return result;

    } catch (err) {

        const result: ConnectionResponse = new ConnectionResponse();

        result.code = 400;
        result.message = err.message;

        return result;
    }

}

function getLaunchUrlFromResponse(response: any): string {

    let selectedResource: any = null;

    const found = response.resources.some( (resource: any) => {

        if (resource.desktopassignmenttype === 'assigned' && resource.isdesktop === true &&  resource.subscriptionstatus === 'subscribed') {
            selectedResource = resource;
            return true;
        } else {
            return false;
        }
    });

    if (found === true && selectedResource != null) {
        return selectedResource.launchurl;
    } else {
        const msg = 'Fail to find desktop';
        throw msg;
    }
}