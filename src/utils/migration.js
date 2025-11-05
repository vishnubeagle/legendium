import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';


export async function migrateUserScenesToV2(userId) {
  if (!userId) {
    console.warn('Migration: No user ID provided');
    return false;
  }

  try {
    console.log('Migration: Starting migration for user:', userId);
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
      console.warn('Migration: User document does not exist');
      return false;
    }

    const data = docSnap.data();
    const needsUpdate = !data.scenesCompleted?.hasOwnProperty('scene6') || !data.scenesCompleted?.hasOwnProperty('scene7');
    
    console.log('Migration: User data check:', {
      hasScene6: data.scenesCompleted?.hasOwnProperty('scene6'),
      hasScene7: data.scenesCompleted?.hasOwnProperty('scene7'),
      needsUpdate,
      currentScenes: Object.keys(data.scenesCompleted || {})
    });

    if (needsUpdate) {
      const updatedScenesCompleted = {
        ...data.scenesCompleted,
        scene6: false,
        scene7: false,
      };
      
      await updateDoc(userRef, {
        scenesCompleted: updatedScenesCompleted
      });
      
      console.log('Migration: Successfully updated user with scene6 and scene7');
      return true;
    } else {
      console.log('Migration: User already has scene6 and scene7');
      return false;
    }
  } catch (error) {
    console.error('Migration: Failed to migrate user:', error);
    return false;
  }
}

/**
 * Check if user needs migration
 */
export async function checkUserNeedsMigration(userId) {
  if (!userId) return false;
  
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) return false;
    
    const data = docSnap.data();
    return !data.scenesCompleted?.hasOwnProperty('scene6') || !data.scenesCompleted?.hasOwnProperty('scene7');
  } catch (error) {
    console.error('Migration: Error checking migration status:', error);
    return false;
  }
}
