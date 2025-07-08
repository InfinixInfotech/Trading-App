export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  // In production, verify token with Upstox or your own JWT implementation
  // For demo purposes, we'll extract user info from token
  try {
    // Mock user extraction - in production, decode/verify the token
    // For now, we'll use the token as the access token and create a mock user
    req.user = {
      user_id: `user_${token.substring(0, 8)}`,
      access_token: token,
      role: 'parent',
    };
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};