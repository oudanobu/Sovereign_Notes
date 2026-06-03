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
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
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
      target: 'es2020',
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
