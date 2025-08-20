export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      message: 'Servidor Netlify funcionando!',
      timestamp: new Date().toISOString(),
      cloudinary: {
        hasConfig: true,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dm6zohuj2'
      }
    }),
  };
};