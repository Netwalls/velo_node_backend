-- PostgreSQL Migration: Fix unpadded Starknet addresses
-- This migration adds missing leading zeros to Starknet addresses
-- to ensure all addresses are properly padded to 66 characters (0x + 64 hex digits)

-- Find and fix addresses that are missing leading zeros
-- For example: 0x2f681a75... becomes 0x02f681a75...

UPDATE user_addresses
SET address = 
    CASE 
        -- Check if address is already properly padded (66 chars including 0x)
        WHEN LENGTH(address) = 66 THEN address
        -- If shorter, pad it with leading zeros
        WHEN LENGTH(address) < 66 AND address LIKE '0x%' THEN
            '0x' || LPAD(SUBSTRING(address FROM 3), 64, '0')
        ELSE address
    END
WHERE chain = 'starknet' 
  AND LENGTH(address) < 66 
  AND address LIKE '0x%';

-- Verify the fix
SELECT 
    id,
    "userId",
    chain,
    network,
    address,
    LENGTH(address) as address_length
FROM user_addresses
WHERE chain = 'starknet'
ORDER BY id DESC;
