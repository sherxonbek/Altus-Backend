import { Router } from 'express';
import { getSavedPlaylists, toggleSavePlaylist } from './user.controller';
import { authenticateJwt } from '../auth/auth.middleware';

export const userRouter = Router();

userRouter.get('/saved', authenticateJwt, getSavedPlaylists);
userRouter.post('/saved/:playlistId', authenticateJwt, toggleSavePlaylist);
