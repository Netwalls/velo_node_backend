import { Request, Response } from 'express';
import pool from '../config/db';

export default class AdminController {
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'User id required' });

      // Run delete in a transaction so we can report errors cleanly
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Some DB schemas don't configure ON DELETE CASCADE for related tables.
        // Delete dependent rows explicitly first to avoid FK constraint failures.
        await client.query('DELETE FROM user_addresses WHERE "userId" = $1', [id]);
        await client.query('DELETE FROM refresh_tokens WHERE "userId" = $1', [id]);

        // Now delete the user
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'User not found' });
        }

        await client.query('COMMIT');
        return res.json({ message: 'User deleted successfully', userId: id });
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Failed to delete user:', err);
        // In development expose error message to help debugging; otherwise return generic error
        if (process.env.NODE_ENV === 'development') {
          return res.status(500).json({ error: 'Failed to delete user', details: err && (err.message || String(err)) });
        }
        return res.status(500).json({ error: 'Failed to delete user' });
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Delete user error:', err);
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ error: 'Server error', details: err && (err.message || String(err)) });
      }
      return res.status(500).json({ error: 'Server error' });
    }
  }
}
