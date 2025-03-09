-- name: CreateSecret :one
INSERT INTO secrets (
    key, value
) VALUES (?, ?)
RETURNING *;

-- name: GetSecret :one
SELECT * FROM secrets
WHERE key = ? LIMIT 1;

-- name: ListSecrets :many
SELECT * FROM secrets
ORDER BY key;

-- name: UpdateSecret :one
UPDATE secrets
SET value = ?,
    updated = CURRENT_TIMESTAMP
WHERE key = ?
RETURNING *;

-- name: DeleteSecret :exec
DELETE FROM secrets
WHERE key = ?; 