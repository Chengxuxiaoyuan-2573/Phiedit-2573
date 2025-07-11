module.exports = {
    presets: [
        '@vue/cli-plugin-babel/preset',
        [
            '@babel/preset-env',
            {
                targets: {
                    browsers: ['last 2 versions', 'ie >= 11'],
                    node: 'current'
                },
                useBuiltIns: 'usage',
                corejs: 3
            }
        ],
        '@babel/preset-typescript'
    ],
    plugins: [
        ["@babel/plugin-proposal-async-generator-functions"],
        ["@babel/plugin-syntax-top-level-await"]
    ]
}