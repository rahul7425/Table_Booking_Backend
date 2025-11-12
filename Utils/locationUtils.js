const User = require('../Models/UserModel');
exports.updateUserLocation = async (userId, latitude, longitude) => {
    try {
        // GeoJSON coordinates array should be [longitude, latitude]
        const coordinates = [longitude, latitude];

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    currentLocation: {
                        type: 'Point',
                        coordinates: coordinates,
                    }
                }
            },
            { 
                new: true, 
                runValidators: true,
                select: 'firstName mobile currentLocation' // Optional: select specific fields to return
            }
        );

        if (!updatedUser) {
            console.warn(`Warning: User with ID ${userId} not found for location update.`);
            return null;
        }

        console.log(`Location updated for user ${userId}: [${longitude}, ${latitude}]`);
        return updatedUser;
        
    } catch (error) {
        console.error(`🔴 Error updating location for user ${userId}:`, error.message);
        throw new Error('Failed to update user location in database.');
    }
};