# liquidx-mem API Documentation

This document describes the REST API endpoints for the liquidx-mem note-taking service.

## Base URL

All API endpoints are prefixed with `/_api/`

## Authentication

The API supports two authentication methods:

- **Firebase Token**: Bearer token in the `Authorization` header (`Authorization: Bearer <token>`)
- **Shared Secret**: Secret parameter for external API access (specific endpoints only)

## Common Response Patterns

- **Success**: JSON response with relevant data
- **Authentication Error**: `403` with `{"error": "Permission denied"}`
- **Not Found**: `404` with `{"error": "..."}`
- **Bad Request**: `400` with `{"error": "..."}`
- **Server Error**: `500` with `{"error": "..."}`

---

## Memory (Mem) Endpoints

### `POST /_api/mem/add`
### `GET /_api/mem/add`

Create a new memory from text or image content.

**Authentication**: Firebase token OR shared secret

**Parameters**:
- `text` (string): Text content to parse into a mem
- `image` (string): Base64-encoded image data  
- `secret` (string): Shared secret for API access

**Response**:
```json
{
  "mem": {
    "_id": "string",
    "userId": "string",
    "url": "string",
    "title": "string",
    "note": "string",
    "tags": ["string"],
    "createdAt": "ISO8601",
    // ... other mem fields
  }
}
```

**Features**:
- Automatically annotates content
- Mirrors media to S3 storage
- Checks for duplicate URLs
- Refreshes tag counts

**Error Responses**: `403`, `500`

---

### `GET /_api/mem/get`

Retrieve a specific memory by ID.

**Authentication**: Firebase token

**Parameters**:
- `memId` (query): ID of the mem to retrieve

**Response**:
```json
{
  "mem": {
    "_id": "string",
    // ... mem fields
  }
}
```

**Error Responses**: `403`, `404`

---

### `POST /_api/mem/list`

Retrieve a filtered list of memories with pagination.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "userId": "string",
  "secretWord": "string",           // optional
  "isArchived": false,              // optional
  "all": false,                     // optional
  "order": "newest",                // optional: "newest" | "oldest"
  "matchAllTags": ["tag1", "tag2"], // optional: AND filter
  "matchAnyTags": ["tag3", "tag4"], // optional: OR filter
  "searchQuery": "search text",     // optional: full-text search
  "pageSize": 20,                   // optional: default varies
  "page": 1                         // optional: 1-based pagination
}
```

**Response**:
```json
{
  "status": "OK",
  "mems": [
    {
      "_id": "string",
      // ... mem fields
    }
  ]
}
```

**Error Responses**: `403`, `500`

---

### `POST /_api/mem/edit`

Update fields of an existing memory.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "memId": "string",
  "updates": {
    "title": "New title",
    "note": "Updated note",
    "tags": ["new", "tags"],
    // ... any other mem fields to update
  }
}
```

**Response**:
```json
{
  "mem": {
    "_id": "string",
    // ... updated mem fields
  }
}
```

**Features**:
- Automatically extracts entities from note text
- Refreshes tag counts after update

**Error Responses**: `400`, `403`, `404`, `500`

---

### `POST /_api/mem/del`

Delete a memory.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "memId": "string"
}
```

**Response**:
```json
{
  "memId": "string"
}
```

**Features**:
- Refreshes tag counts after deletion

**Error Responses**: `400`, `403`, `500`

---

### `POST /_api/mem/flag`

Update memory flags and status.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "memId": "string",
  "new": true,    // optional: mark as new/not new
  "seen": false   // optional: add/remove #look tag
}
```

**Response**:
```json
{
  "mem": {
    "_id": "string",
    // ... updated mem fields
  }
}
```

**Features**:
- Controls "new" status flag
- Automatically manages "#look" tag

**Error Responses**: `400`, `403`, `404`, `500`

---

### `POST /_api/mem/attach`

Attach an image file to an existing memory.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "mem": "memId",
  "image": {
    "filename": "image.jpg",
    "mimetype": "image/jpeg",
    "body": "base64encodeddata"
  }
}
```

**Response**:
```json
{
  "mem": {
    "_id": "string",
    "photos": [
      {
        "url": "string",
        "filename": "string"
      }
    ],
    // ... other mem fields
  }
}
```

**Features**:
- Uploads image to S3 storage
- Adds to mem's photos array

**Error Responses**: `403`, `404`, `500`

---

### `POST /_api/mem/media-remove`

Remove specific media from a memory.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "memId": "string",
  "mediaUrl": "string"
}
```

**Response**:
```json
{
  "mem": {
    "_id": "string",
    // ... updated mem fields
  }
}
```

**Error Responses**: `400`, `403`, `404`, `500`

---

### `POST /_api/mem/annotate`

Process memory content to extract metadata and mirror media.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "memId": "string"
}
```

**Response**:
```json
{
  "mem": {
    "_id": "string",
    // ... annotated mem fields
  },
  "memId": "string"
}
```

**Features**:
- Extracts titles, descriptions, and metadata
- Mirrors media to S3 storage
- Updates mem with enriched content

**Error Responses**: `400`, `403`, `500`

---

## User Endpoints

### `GET /_api/mem/user/get`
### `POST /_api/mem/user/get`

Get user ID by shared secret.

**Authentication**: Shared secret only

**Parameters**:
- `secret` (string): Shared secret

**Response**:
```json
{
  "userId": "string"
}
```

**Error Responses**: `400`, `404`, `405`

---

## Tag Endpoints

### `GET /_api/tag/list`

Get tag counts for a user.

**Authentication**: Firebase token

**Parameters**:
- `userId` (query): User ID
- `filter` (query, optional): Tag filter for conditional counts

**Response**:
```json
{
  "counts": [
    {
      "tag": "string",
      "count": 5,
      "icon": "string"  // optional
    }
  ]
}
```

**Behavior**:
- Without filter: Returns all tags with counts
- With filter: Returns tag counts for mems matching the filter

**Error Responses**: `403`, `500`

---

### `GET /_api/tag/suggest`

Get tag suggestions based on query.

**Authentication**: Firebase token

**Parameters**:
- `userId` (query): User ID
- `query` (query, optional): Search query for tag suggestions
- `limit` (query, optional): Max results (default: 10, max: 25)

**Response**:
```json
{
  "suggestions": [
    {
      "tag": "string",
      "count": 5,
      "icon": "string"  // optional
    }
  ]
}
```

**Features**:
- Results sorted by count, then alphabetically
- Supports partial matching

**Error Responses**: `400`, `403`

---

### `POST /_api/tag/generate`

Manually refresh tag counts for a user.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "userId": "string"
}
```

**Response**:
```json
{
  "counts": [
    {
      "tag": "string",
      "count": 5,
      "icon": "string"  // optional
    }
  ]
}
```

**Error Responses**: `403`, `500`

---

## Preferences Endpoints

### `GET /_api/prefs`

Read a user preference.

**Authentication**: Firebase token

**Parameters**:
- `key` (query): Preference key

**Response**:
```json
{
  "key": "string",
  "settings": "any"  // Value can be any JSON type
}
```

**Error Responses**: `400`, `403`, `500`

---

### `POST /_api/prefs`

Write a user preference.

**Authentication**: Firebase token

**Request Body**:
```json
{
  "key": "string",
  "settings": "any"  // Value can be any JSON type
}
```

**Response**:
```json
{
  "key": "string",
  "settings": "any"
}
```

**Error Responses**: `403`, `500`

---

## Data Types

### Mem Object
```typescript
{
  _id: string;
  userId: string;
  url?: string;
  title?: string;
  note?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt?: Date;
  isArchived?: boolean;
  new?: boolean;
  photos?: MemPhoto[];
  videos?: MemVideo[];
  links?: MemLink[];
  // ... other fields
}
```

### MemPhoto Object
```typescript
{
  url: string;
  filename?: string;
  width?: number;
  height?: number;
  // ... other metadata
}
```

### TagCount Object
```typescript
{
  tag: string;
  count: number;
  icon?: string;
}
```

---

## Notes

- All endpoints include CORS headers for cross-domain requests
- Most endpoints automatically refresh tag counts when content is modified
- Image uploads are stored in S3-compatible storage
- Full-text search is supported via MongoDB text indexes
- Pagination is 1-based for the `page` parameter