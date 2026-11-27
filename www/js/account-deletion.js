export async function deleteAccountInOrder({ reauthenticate, deleteRecords, deleteLogin }) {
  await reauthenticate();
  await deleteRecords();
  await deleteLogin();
}
