import { Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { User } from '../models/user.model';
import mongoose from 'mongoose';

export const getSavedPlaylists = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).populate('savedPlaylists');
    if (!user) {
      res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
      return;
    }

    res.status(200).json({
      success: true,
      data: user.savedPlaylists,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleSavePlaylist = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const playlistId = req.params.playlistId as string;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      res.status(400).json({ success: false, message: 'Yaroqsiz playlistId' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
      return;
    }

    const playlistObjectId = new mongoose.Types.ObjectId(playlistId);
    
    // Check if it's already saved
    const isSaved = user.savedPlaylists.some((id) => id.toString() === playlistId);

    if (isSaved) {
      // Remove it
      user.savedPlaylists = user.savedPlaylists.filter((id) => id.toString() !== playlistId);
      await user.save();
      res.status(200).json({ success: true, isSaved: false, message: 'Playlist saqlanganlardan olib tashlandi' });
    } else {
      // Add it
      user.savedPlaylists.push(playlistObjectId);
      await user.save();
      res.status(200).json({ success: true, isSaved: true, message: 'Playlist saqlanganlarga qoʻshildi' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
