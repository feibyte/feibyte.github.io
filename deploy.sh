#!/bin/bash

# Build CN blog
cd blog-cn && npm run build

# Build En blog
cd ../blog-en && npm run build

cd ../blog-cn
mv ../blog-en/public ./public/en 
mkdir ./public/en &&mv ../blog-en/public/* ./public/en/

npm run deploy