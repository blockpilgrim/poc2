import React from 'react';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-semibold text-center text-gray-700 mb-6">
          Login Page
        </h1>
        <p className="text-gray-600 text-center">
          Login form will go here.
        </p>
        {/* Placeholder for login button or form elements */}
        <div className="mt-6 text-center">
          <button 
            type="button"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Simulate Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;