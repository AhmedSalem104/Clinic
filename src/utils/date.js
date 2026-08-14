const pad = (value) => String(value).padStart(2, '0');

const clinicDateKey = (value = Date.now()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

module.exports = { clinicDateKey };
