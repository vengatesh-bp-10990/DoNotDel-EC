import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Catalyst Auth handles signup via the same embedded sign-in form (Public Signup enabled)
function Signup() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);
  return null;
}

export default Signup;
