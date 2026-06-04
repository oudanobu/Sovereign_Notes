import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig(() => {
  const isSingleFile = process.env.VITE_BUILD_SINGLE_FILE === 'true';

  const plugins: any[] = [
    react(),
    tailwindcss(),
  ];

  if (isSingleFile) {
    plugins.push(viteSingleFile());
  } else {
    plugins.push(
      legacy({
        targets: ['firefox >= 68', 'chrome >= 49', 'android >= 5', 'chrome >= 30', 'ios >= 9'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
        modernPolyfills: true,
        renderLegacyChunks: true
      })
    );
  }

  // Push post-processor last to ensure it runs after legacy
  plugins.push({
    name: 'strip-cors-module-and-property',
    enforce: 'post',
    generateBundle(options, bundle) {
      for (const [fileName, file] of Object.entries(bundle)) {
        const anyFile = file as any;
        if (fileName.endsWith('.css') && anyFile && 'source' in anyFile && typeof anyFile.source === 'string') {
          anyFile.source = anyFile.source.replace(/@property\s+--[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, '');
        }
        if (fileName.endsWith('.js') && anyFile && 'code' in anyFile && typeof anyFile.code === 'string') {
          // Replace modern regex representation /()??/ with dynamic runtime RegExp to prevent SyntaxError compile failure on older WebViews
          anyFile.code = anyFile.code.replace(/\/\(\)\?\?\//g, 'new RegExp("()??")');
        }
        // Direct sanitization: clean HTML inline scripts or JS leaks in the output bundle
        if (fileName.endsWith('.html') && anyFile && 'source' in anyFile && typeof anyFile.source === 'string') {
          console.log("执行方案 C：正在对 index.html 实施内联探测脚本无损物理切除...");
          let html = anyFile.source;

          // 【大杀器 1】：直接把带有不兼容语法的内联 Module 探测脚本或系统内联判断脚本彻底蒸发
          // 匹配任何包含 `?` 或 `nomodule` 逻辑、自作聪明的内联 script 块
          html = html.replace(/<script\b[^>]*>([\s\S]*?\?[\s\S]*?)<\/script>/gi, '');

          // 【大杀器 2】：确保没有残留的正则自杀字面量
          html = html.replace(/\/\(\)\?\?\//g, 'new RegExp("()??")');

          anyFile.source = html;
        }
      }
    },
    transformIndexHtml(html: string) {
      // Direct replace of @property declarations within style tags
      let res = html.replace(/@property\s+--[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, '');
      res = res.replace(/ crossorigin/gi, ''); // Replace attribute with leading space
      if (!isSingleFile) {
         res = res.replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/gi, '');
         res = res.replace(/<link rel="modulepreload"[^>]*>/gi, '');
         res = res.replace(/<script nomodule/gi, '<script');
         // Strip the Safari 10 nomodule polyfill script that we just broke
         res = res.replace(/<script[^>]*>!function\(\)\{var e=document,t=e\.createElement\("script"\);[\s\S]*?<\/script>/gi, '');
         res = res.replace(/<script[^>]*id="vite-legacy-entry"[^>]*>[\s\S]*?<\/script>/gi, (match) => {
           const m = match.match(/data-src="([^"]+)"/);
           return m ? `<script src="${m[1]}"></script>` : match;
         });
      }
      // Apply Scenario C: physically slice any inline scripts with un-polyfillable modern tokens or conditional logic
      res = res.replace(/<script\b[^>]*>([\s\S]*?\?[\s\S]*?)<\/script>/gi, '');
      res = res.replace(/\/\(\)\?\?\//g, 'new RegExp("()??")');
      return res;
    }
  });

  return {
    base: './',
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: isSingleFile ? 'es2017' : 'es2020',
      cssTarget: 'firefox68',
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 100000000,
      cssCodeSplit: false,
      minify: false, // Debug version: do not minify to facilitate inspector usage
      rollupOptions: {
        inlineDynamicImports: true,
        output: {
          manualChunks: undefined,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
