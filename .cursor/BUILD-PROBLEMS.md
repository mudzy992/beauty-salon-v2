#14 [build 6/6] RUN npm run build

#14 0.319

#14 0.319 > beauty-salon-v2-frontend@0.0.1 build

#14 0.319 > tsc -b && vite build

#14 0.319

#14 16.57 src/components/brand/uploaded-brand-logo.tsx(3,28): error TS2307: Cannot find module './media-image' or its corresponding type declarations.

#14 16.57 src/pages/public/PublicBlogPost.tsx(6,10): error TS6133: 'publicHeader' is declared but its value is never read.

#14 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

Dockerfile:10

------

 > [build 6/6] RUN npm run build:

0.319

0.319 > beauty-salon-v2-frontend@0.0.1 build

0.319 > tsc -b && vite build

0.319

16.57 src/components/brand/uploaded-brand-logo.tsx(3,28): error TS2307: Cannot find module './media-image' or its corresponding type declarations.

16.57 src/pages/public/PublicBlogPost.tsx(6,10): error TS6133: 'publicHeader' is declared but its value is never read.

------
