export function getCurrentDate() {
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const year = currentDate.getFullYear();
  return `${day}.${month}.${year}`;
}

export function getCurrentTime() {
  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours() + 4);
  const hour = String(currentDate.getHours()).padStart(2, '0');
  const minute = String(currentDate.getMinutes()).padStart(2, '0');
  const second = String(currentDate.getSeconds()).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
}
export const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
