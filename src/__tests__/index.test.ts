import { getPrimaryDesktopConnection } from '../index';
import { ConnectionResponse } from '../connection-response';

test('Get default desktop', async () => {

  const username = process.env.TESTUSERNAME || '';
  const password = process.env.TESTPASSWORD || '';
  const hostname = process.env.TESTHOSTNAME || '';

  expect(username).not.toBe('');
  expect(password).not.toBe('');
  expect(hostname).not.toBe('');

  const response: ConnectionResponse = await getPrimaryDesktopConnection(username, password, hostname);

  expect(response.code).toBe(200);
});
