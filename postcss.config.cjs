// 🛠️ PostCSS 降级编译链 (针对诺基亚 N1 & 夏普平板物理兼容)
module.exports = {
  plugins: [
    // 1. 将所有 CSS 变量翻译为纯数值，不给老系统任何理解成本
    require('postcss-custom-properties')({
      preserve: false // 🚨 关键：设为 false，打包后不再保留 var()，而是直接输出固定项目
    }),
    
    // 2. 将现代的 gap 属性自动转换为老系统绝对支持的 margin/padding
    require('postcss-gap-properties')(),

    // 3. 自动补全老旧系统的 CSS 前缀（如 -webkit-box-flex）
    require('autoprefixer')({
      overrideBrowserslist: [
        'Android >= 5',  // 🎯 精准覆盖诺基亚 N1（Android 5.0）
        'Chrome >= 70'   // 🎯 精准覆盖夏普 R2 默认内核
      ]
    })
  ]
};
