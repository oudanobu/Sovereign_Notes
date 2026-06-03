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
        targets: ['chrome >= 30', 'android >= 4.4', 'ios >= 9'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      })
    );
  }

  // Push post-processor last to ensure it runs after legacy
  plugins.push({
    name: 'strip-cors-and-module',
    enforce: 'post',
    transformIndexHtml(html: string) {
      let res = html.replace(/ crossorigin/gi, ''); // Replace attribute with leading space
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
      target: isSingleFile ? 'es2015' : ['es2015', 'chrome69'],
      cssTarget: 'chrome30',
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 100000000,
      cssCodeSplit: false,
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
