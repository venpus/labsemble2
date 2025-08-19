const express = require('express');
const router = express.Router();

// Mock users database (실제로는 MongoDB 등을 사용)
const users = [
  {
    id: 1,
    email: 'admin@manufacturing.com',
    companyName: 'Manufacturing Corp',
    contactPerson: 'Admin User',
    phone: '+1-555-0123',
    role: 'admin',
    createdAt: new Date()
  }
];

// Get user profile
router.get('/profile', (req, res) => {
  // In a real app, you'd get the user ID from the JWT token
  const userId = req.headers['user-id'] || 1;
  const user = users.find(u => u.id === parseInt(userId));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Don't send password
  const { password, ...userProfile } = user;
  res.json(userProfile);
});

// Update user profile
router.patch('/profile', (req, res) => {
  const userId = req.headers['user-id'] || 1;
  const user = users.find(u => u.id === parseInt(userId));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { companyName, contactPerson, phone } = req.body;
  
  if (companyName !== undefined) user.companyName = companyName;
  if (contactPerson !== undefined) user.contactPerson = contactPerson;
  if (phone !== undefined) user.phone = phone;
  
  user.updatedAt = new Date();
  
  const { password, ...userProfile } = user;
  res.json({
    message: 'Profile updated successfully',
    user: userProfile
  });
});

// Get all users (admin only)
router.get('/', (req, res) => {
  // In a real app, check if user is admin
  const usersWithoutPassword = users.map(user => {
    const { password, ...userProfile } = user;
    return userProfile;
  });
  
  res.json(usersWithoutPassword);
});

module.exports = router; 