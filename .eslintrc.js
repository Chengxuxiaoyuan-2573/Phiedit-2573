/* eslint sort-keys: "error" */
const INDENT = 4;
module.exports = {
    env: {
        es2021: true,
        node: true
    },
    extends: [
        "eslint:recommended",
        "plugin:vue/vue3-recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    overrides: [
        {
            files: ["*.vue"],
            parser: "vue-eslint-parser"
        },
        {
            files: ["*.json", "*.json5", "*.jsonc"],
            parser: "json",
            rules: {
                "comma-dangle": ["error", "never"]
            }
        }
    ],
    parser: "vue-eslint-parser",
    parserOptions: {
        ecmaVersion: 2020,
        parser: "@typescript-eslint/parser",
        sourceType: "module"
    },
    plugins: [
        "vue",
        "@typescript-eslint"
    ],
    root: true,
    rules: {
        /** 箭头函数的箭头前后要有空格 */
        "arrow-spacing": "error",

        /**
         * 强制使用 Stroustrup 大括号风格，也就是这种换行格式：
         * if、else 等语句的左括号与语句头在同一行，右括号独占一行
         * ```typescript
         * if (condition) {
         *     doSomething();
         * }
         * else {
         *     doSomethingElse();
         * }
         *
         * for (let i = 0; i < 10; i++) {
         *     console.log(i);
         * }
         * ```
         */
        "brace-style": ["error", "stroustrup"],

        /**
         * 要求属性名称使用驼峰式命名法
         */
        camelcase: ["error", {
            properties: "always"
        }],

        /** 强制逗号后必须有空格，逗号前禁止空格 */
        "comma-spacing": ["error", {
            after: true,
            before: false,
        }],

        /**
         * 强制多行语句必须使用大括号包裹
         */
        curly: ["error", "multi-line"],

        /**
         * 强制使用 === 和 !==，禁止使用 == 和 !=
         */
        eqeqeq: ["error", "always"],

        "generator-star-spacing": ["error", "after"],

        /**
         * 设置基础缩进为 4 个空格
         * 特殊处理 SwitchCase 缩进 1 级，变量声明对齐第一个变量
         */
        indent: ["error", INDENT, {
            SwitchCase: 1,
            VariableDeclarator: "first"
        }],

        /** 关键字前后要有空格 */
        "keyword-spacing": ["error", {
            after: true,
            before: true,
        }],

        /**
         * 要求注释前面必须要有空行
         * 注释如果在第一行，前面可以不空行
         * 注释前面如果还是注释也可以不空行
         */
        "lines-around-comment": ["error", {
            allowArrayStart: true,
            allowBlockStart: true,
            allowClassStart: true,
            allowObjectStart: true,
            beforeBlockComment: true,
            beforeLineComment: true,

            // allowInterfaceStart: true,
        }],

        /** 三元运算符换行 */
        "multiline-ternary": ["error", "always-multiline"],

        /** 链式调用必须换行 */
        "newline-per-chained-call": "error",

        /** 禁止不必要的括号 */
        "no-extra-parens": "error",

        /** 禁止多余的分号 */
        "no-extra-semi": "error",

        /**
         * 禁止使用行内注释
         */
        "no-inline-comments": ["error"],

        /** 禁止在循环中定义函数 */
        "no-loop-func": "error",

        /**
         * 禁止使用魔法数字，但有一些除外
         */
        "no-magic-numbers": ["error", {
            ignore: [
                // -1 是 find 函数未找到时的返回值
                -1,

                // 0 应该不用多说了吧
                0,

                // 有些时候要取数组的最后一项，要用到 arr[arr.length - 1]
                1,

                // 需要把某些东西除以 2 或乘以 0.5 来获取某些东西的中点
                2, 0.5,

                // shader 中要用到 vec3 和 vec4 型的值
                3, 4,

                // 用于计算 10 的幂
                10,

                // 用于把小数和百分数进行转换
                100,

                // 用于对角度之类的东西进行处理
                180, -180, 360, -360, 90, -90,

                // 用于对颜色或透明度之类的东西进行处理
                255,

                // 用于检测是否超出 32 位无符号/有符号整数
                0xffffffff, 0x100000000, -0xffffffff, -0x100000000,
                0x7fffffff, 0x80000000, -0x7fffffff, -0x80000000,
            ],
            "ignoreDefaultValues": true
        }],

        "no-multiple-empty-lines": ["error", {
            "max": 1,
            "maxBOF": 0,
            "maxEOF": 0
        }],

        /** 禁止使用 tab */
        "no-tabs": "error",

        /** 禁止行尾空格 */
        "no-trailing-spaces": "error",

        /**
         * 禁止使用 var，必须使用 let 或 const
         */
        "no-var": ["error"],

        /** 禁止在属性的 . 或 [] 前后添加空格 */
        "no-whitespace-before-property": "error",

        /** 对象的花括号要么都换行，要么都不换行 */
        "object-curly-newline": ["error", {
            "consistent": true
        }],

        /**
         * 强制操作符换行时必须放在行尾
         */
        "operator-linebreak": ["error", "after"],

        /**
         * 要求多行的对象、函数、数组的最后一行和结尾的括号之间不能有空行
        */
        "padded-blocks": ["error", {
            blocks: "never",
            classes: "never",
            switches: "never"
        }],

        "padding-line-between-statements": [
            "error",
            {
                "blankLine": "always",
                "next": ["const", "let", "var"],
                "prev": ["function", "class", "block", "block-like", "iife"],
            },
            {
                "blankLine": "always",
                "next": ["function", "class", "block", "block-like", "iife"],
                "prev": ["function", "class", "block", "block-like", "iife"],
            },
        ],

        /**
         * 强制使用双引号，禁止使用单引号
         */
        quotes: ["error", "double", {
            allowTemplateLiterals: true
        }],

        /**
         * 强制所有语句以分号结束
         * 避免因省略分号可能导致的解析错误或意外行为
         */
        semi: ["error", "always"],

        /** 分号必须放在行末 */
        "semi-style": ["error", "last"],

        /** 禁止在块之前使用空格 */
        "space-before-blocks": ["error", {
            "classes": "always",
            "functions": "always",
            "keywords": "always",
        }],

        /** 禁止在括号和括号的内容之间使用空格 */
        "space-in-parens": ["error", "never"],

        /**
         * 强制中缀运算符两侧必须有空格
         * 禁用 32 位整数优化提示，保持运算符可读性优先
         */
        "space-infix-ops": ["error", {
            int32Hint: false
        }],

        "space-unary-ops": [2, {
            "nonwords": false,
            "words": true,
        }],

        /** 注释的 // 或 /* 后面必须至少有一个空格 */
        "spaced-comment": ["error", "always"],

        "switch-colon-spacing": ["error", {
            "after": true, "before": false
        }],

        "template-curly-spacing": ["error", "never"],

        /**
         * 设置 Vue 文件中组件名称为 PascalCase
         * 该规则确保组件名称遵循 PascalCase 格式，即每个单词首字母大写，以提升代码可读性
         */
        "vue/component-name-in-template-casing": ["error", "PascalCase"],

        /**
         * 设置 Vue 文件中 HTML 内容的缩进为 4 个空格
         * 该规则确保 Vue 模板中的 HTML 元素以统一的缩进显示，提升代码可读性
         */
        "vue/html-indent": ["error", INDENT],
    }
};