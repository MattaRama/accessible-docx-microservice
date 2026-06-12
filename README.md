# accessible-docx-microservice

A microservice that automatically adds alt text to images embedded in Word (`.docx`) documents, helping make documents more accessible for screen reader users. Uses OpenAI's models for image analysis and alt text generation.

## Features

- Accepts `.docx` files and scans embedded images
- Uses RAG to retrieve relevant context from the word documents
- Automatically generates and inserts descriptive alt text for images that are missing it
- Returns an updated `.docx` file with accessibility metadata applied
- Built with TypeScript and Bun, containerized with Docker
- Usage logging and authentication using Supabase

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

## Usage

All API endpoints are mounted at the root path (`/`) and require authentication via a Bearer token in the `Authorization` header.

### Authentication

Include your API key in the request headers for all calls:
```http
Authorization: Bearer <your-api-key>
```

---

### 1. Start Alt-Text Job

Uploads a `.docx` file to initiate a background alt-text generation job.

* **Endpoint**: `POST /` (documented in code as `POST /alttext`)
* **Content-Type**: `multipart/form-data`
* **Request Parameters**:
  * `uploadedFile` (File, required): The `.docx` document to process. Must be exactly one file of the correct mimetype (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
* **Success Response (`201 Created`)**:
  ```json
  {
    "jobId": "uuid-v4-job-id"
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (Invalid file count):
    ```json
    {
      "reason": "Invalid file count (must be exactly 1)"
    }
    ```
  * `401 Unauthorized` (Invalid file type / missing auth headers):
    ```json
    {
      "reason": "Invalid file type"
    }
    ```
  * `500 Internal Server Error`:
    ```json
    {
      "reason": "Internal server error."
    }
    ```
* **Example Request**:
  ```bash
  curl -X POST http://localhost:8080/ \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -F "uploadedFile=@/path/to/document.docx"
  ```

---

### 2. Get Job Status

Checks the current status of an alt-text generation job.

* **Endpoint**: `GET /` (documented in code as `GET /alttext`)
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "jobId": "uuid-v4-job-id"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "jobId": "uuid-v4-job-id",
    "jobStatus": "PENDING" | "RUNNING" | "COMPLETE" | "FAILED"
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (Missing `jobId` or job not found):
    ```json
    {
      "reason": "Invalid response body provided (requires jobId)"
    }
    ```
* **Example Request**:
  ```bash
  curl -X GET http://localhost:8080/ \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jobId": "YOUR_JOB_ID"}'
  ```

---

### 3. Fetch Job Result

Retrieves metadata and the final updated `.docx` document data for a completed job.

* **Endpoint**: `GET /fetch` (documented in code as `GET /alttext/fetch`)
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "jobId": "uuid-v4-job-id"
  }
  ```
* **Success Response (`200 OK` when status is `COMPLETE`)**:
  ```json
  {
    "name": "document.docx",
    "size": 12345,
    "encoding": "7bit",
    "tempFilePath": "",
    "truncated": false,
    "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "data": "UEsDBBQAAAAIA..." // Base64 encoded .docx file content
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (Job still running/pending or missing `jobId`):
    ```json
    {
      "reason": "Job with ID YOUR_JOB_ID has status RUNNING"
    }
    ```
  * `500 Internal Server Error` (If job execution failed):
    ```json
    {
      "status": "FAILED",
      "reason": "Description of the failure/error message",
      "jobId": "uuid-v4-job-id"
    }
    ```
* **Example Request**:
  ```bash
  curl -X GET http://localhost:8080/fetch \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jobId": "YOUR_JOB_ID"}'
  ```

---

### 4. Subscribe to Job Result

Long-poll connection that returns immediately if the job is finished, or holds the connection open and responds as soon as the job transitions to `COMPLETE` or `FAILED`.

* **Endpoint**: `GET /subscribe` (documented in code as `GET /alttext/subscribe`)
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "jobId": "uuid-v4-job-id"
  }
  ```
* **Success Response (`200 OK` on success)**:
  ```json
  {
    "name": "document.docx",
    "size": 12345,
    "encoding": "7bit",
    "tempFilePath": "",
    "truncated": false,
    "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "data": "UEsDBBQAAAAIA..." // Base64 encoded .docx file content
  }
  ```
* **Error Responses**:
  * `400 Bad Request` (Missing `jobId` or job not found)
  * `500 Internal Server Error` (If the job failed or met an internal server error):
    ```json
    {
      "status": "FAILED",
      "reason": "Description of error or internal server error",
      "jobId": "uuid-v4-job-id"
    }
    ```
* **Example Request**:
  ```bash
  curl -X GET http://localhost:8080/subscribe \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jobId": "YOUR_JOB_ID"}'
  ```

## License

This project is licensed under the GPL-3.0 License. See [LICENSE](LICENSE) for details.