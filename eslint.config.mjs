// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    "@stylistic/brace-style": ["off"],
    "@stylistic/comma-dangle": ["off"],
    "@stylistic/indent": ["error", 2],
    "@stylistic/member-delimiter-style": "off",
    "@stylistic/quotes": ["error", "double"],
    "@stylistic/semi": ["error", "always"],
    "vue/first-attribute-linebreak": "off",
    "vue/html-closing-bracket-newline": "off",
    "vue/html-indent": "off",
    "vue/max-attributes-per-line": "off",
    "vue/multi-word-component-names": "off",
    "vue/multiline-html-element-content-newline": "off",
    "vue/no-multiple-template-root": "off",
    "vue/singleline-html-element-content-newline": "off",
  },
});
