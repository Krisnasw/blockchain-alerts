# Base image
FROM node:18-alpine

# Set environment variables
ENV DB_URL="postgresql://blockchain_test_owner:78BvVogTidef@ep-noisy-dust-a1wdn0z4.ap-southeast-1.aws.neon.tech/blockchain_test?sslmode=require"
ENV MORALIS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjZjZmQ5NjRkLWRmODUtNGUxMy04MjUxLWYzNWY5MGRmNDZjYSIsIm9yZ0lkIjoiNDExMDkzIiwidXNlcklkIjoiNDIyNDU3IiwidHlwZUlkIjoiNzA2Zjk0ZTMtMzk1NC00NzMyLThjNTUtMTA3YjRlMWJkMjJhIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Mjg0ODAxOTQsImV4cCI6NDg4NDI0MDE5NH0.Z4cl0AlPKe8a3QEDxdgf5a4h4a38QG4qMLqUYSLUaUE
ENV RESEND_API_KEY=re_D8WiGGrD_LuCa9qScbWWzpuCQckdL4njQ

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN pnpm i

# Bundle app source
COPY . .

# Install and configure Prisma
RUN npx prisma generate

# Creates a "dist" folder with the production build
RUN pnpm build

# Start the server using the production build
CMD [ "node", "dist/main.js" ]