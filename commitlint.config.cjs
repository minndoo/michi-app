module.exports = {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: true,
  ignores: [
    (message) => message.startsWith('Merge '),
    (message) => message.startsWith('Squashed commit'),
    (message) => message.includes('# This is a combination of'),
  ],
};
