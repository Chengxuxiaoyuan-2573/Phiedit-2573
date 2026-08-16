const { defineConfig } = require('@vue/cli-service');
module.exports = defineConfig({
	transpileDependencies: true,
	devServer: {
		host: '0.0.0.0',
		port: 8080
	},
	publicPath: './',
	pluginOptions: {
		electronBuilder: {
			mainProcessFile: 'src/background.ts',
			preload: 'src/preload.ts',
			outputDir: 'dist_electron',
			mainProcessWatch: [],
		},
	}
})
