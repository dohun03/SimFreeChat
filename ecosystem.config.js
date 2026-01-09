module.exports = {
  apps: [{
    name: 'chatserver',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    instance_var: "NODE_APP_INSTANCE",
    env: {
      NODE_ENV: 'production',
    },
  }],
};