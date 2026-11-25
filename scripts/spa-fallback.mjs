// GitHub Pages has no SPA rewrites: serving index.html as 404.html lets deep links
// such as /personal-finance-app/budgets load the app, which then routes client-side.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('dist/404.html created for client-side routing on GitHub Pages')
