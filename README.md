# accessible-docx-microservice

A microservice that automatically adds alt text to images embedded in Word (`.docx`) documents, helping make documents more accessible for screen reader users. Uses OpenAI's models for image analysis and alt text generation.

## Features

- Accepts `.docx` files and scans embedded images
- Uses RAG to retrieve relevant context from the word documents
- Automatically generates and inserts descriptive alt text for images that are missing it
- Returns an updated `.docx` file with accessibility metadata applied
- Built with TypeScript and Bun, containerized with Docker
- Usage logging using Supabase

## Tech Stack

- [Bun](https://bun.com) — JavaScript/TypeScript runtime
- TypeScript
- Docker

## Getting Started

### Prerequisites

- [Bun](https://bun.com) v1.3.14 or later
- Docker (optional, for containerized deployment)

### Installation

```bash
bun install
```

### Configuration

Copy the environment template and fill in the required values:

```bash
cp .env.template .env
```

### Running locally

```bash
bun dev
```

### Running with Docker

```bash
docker build -t accessible-docx-microservice .
docker run --env-file .env -p 8080:8080 accessible-docx-microservice
```

## Project Structure

```
.
├── src/        # Application source code
├── tools/      # Helper scripts / utilities
├── Dockerfile
├── .env.template
└── package.json
```

## License

This project is licensed under the GPL-3.0 License. See [LICENSE](LICENSE) for details.