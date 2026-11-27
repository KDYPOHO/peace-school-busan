import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteAccountInOrder } from '../www/js/account-deletion.js';

test('deletes participant records before removing the login', async () => {
  const calls = [];
  await deleteAccountInOrder({
    reauthenticate: async () => calls.push('verify'),
    deleteRecords: async () => calls.push('records'),
    deleteLogin: async () => calls.push('login')
  });
  assert.deepEqual(calls, ['verify', 'records', 'login']);
});

test('an authentication failure leaves records and login in place', async () => {
  await assert.rejects(deleteAccountInOrder({
    reauthenticate: async () => { throw new Error('wrong password'); },
    deleteRecords: async () => assert.fail('records were removed'),
    deleteLogin: async () => assert.fail('login was removed')
  }), /wrong password/);
});

test('a data deletion failure leaves the login available to retry', async () => {
  await assert.rejects(deleteAccountInOrder({
    reauthenticate: async () => {},
    deleteRecords: async () => { throw new Error('server unavailable'); },
    deleteLogin: async () => assert.fail('login was removed')
  }), /server unavailable/);
});
