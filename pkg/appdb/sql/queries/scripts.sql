-- name: CreateScript :one
INSERT INTO scripts (
    name, content, access_level
) VALUES (?, ?, ?)
RETURNING *;

-- name: GetScript :one
SELECT * FROM scripts
WHERE name = ? LIMIT 1;

-- name: ListScripts :many
SELECT * FROM scripts
ORDER BY name;

-- name: ListScriptsByAccess :many
SELECT * FROM scripts
WHERE access_level = ?
ORDER BY name;

-- name: UpdateScript :one
UPDATE scripts
SET content = ?, 
    access_level = ?,
    updated = CURRENT_TIMESTAMP
WHERE name = ?
RETURNING *;

-- name: DeleteScript :exec
DELETE FROM scripts
WHERE name = ?; 