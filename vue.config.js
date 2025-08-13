const { defineConfig } = require('@vue/cli-service');
const webpackConfig = require('./webpack.config.js');
module.exports = defineConfig({
	transpileDependencies: true,
	devServer: {
		host: '0.0.0.0',
		port: 8080
	},
	configureWebpack: webpackConfig,
	chainWebpack: config => {
		config.plugin("define").tap((definitions) => {
			Object.assign(definitions[0], {
				__VUE_OPTIONS_API__: 'true',
				__VUE_PROD_DEVTOOLS__: 'false',
				__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
			})
			return definitions
		})
	},
	publicPath: './',
	pluginOptions: {
		electronBuilder: {
			mainProcessFile: 'src/background.ts',
			preload: 'src/preload.ts',
			outputDir: 'dist_electron',
			mainProcessWatch: []
		}
	}
})
