import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/api/auth/register', data);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError('root', { message: err.response?.data?.message || 'Registration failed' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden flex">

        {/* Left Panel */}
        <div className="hidden md:flex flex-col justify-center bg-indigo-600 text-white px-10 py-12 w-1/2">
          <h1 className="text-3xl font-bold mb-3">DocSign</h1>
          <p className="text-indigo-200 text-sm leading-relaxed">
            Join thousands of professionals signing documents securely with full audit trails and legal traceability.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-indigo-100">
            {['Free to get started', 'No credit card needed', 'Enterprise-grade security', 'Real-time status tracking'].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Panel — Form */}
        <div className="flex-1 px-8 py-12 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-6">Start signing documents in minutes</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
              <input
                {...register('name')}
                placeholder="John Doe"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input
                {...register('email')}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Min. 6 characters"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-red-600 text-sm">{errors.root.message}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
