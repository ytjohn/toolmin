-- name: CreateVar :one
INSERT INTO vars (
    key, value
) VALUES (?, ?)
RETURNING *;

-- name: GetVar :one
SELECT * FROM vars
WHERE key = ? LIMIT 1;

-- name: ListVars :many
SELECT * FROM vars
ORDER BY key;

-- name: UpdateVar :one
UPDATE vars
SET value = ?,
    updated = CURRENT_TIMESTAMP
WHERE key = ?
RETURNING *;

-- name: DeleteVar :exec
DELETE FROM vars
WHERE key = ?; 