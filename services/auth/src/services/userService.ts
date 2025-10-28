import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export const createUserIfNotExists = async (email: string, password: string): Promise<User | null> => {
  const repo = AppDataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });
  if (existing) return null;
  const user = repo.create({ email, password });
  await repo.save(user);
  return user;
};

export const findUserByEmail = async (email: string) => {
  const repo = AppDataSource.getRepository(User);
  return await repo.findOne({ where: { email } });
};
