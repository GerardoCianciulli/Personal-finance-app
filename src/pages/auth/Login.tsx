import { Form, Formik } from 'formik'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasswordField, TextField } from '../../components/form/fields'
import { AuthError, useAuth } from '../../context/AuthContext'
import { loginSchema } from '../../validation'
import AuthLayout from './AuthLayout'

export default function Login() {
  const { logIn } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')

  return (
    <AuthLayout>
      <section className="auth-card" aria-labelledby="login-title">
        <h2 className="text-preset-1" id="login-title">
          Login
        </h2>
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={loginSchema}
          onSubmit={async (values, { setFieldError }) => {
            setFormError('')
            try {
              await logIn(values)
              navigate('/', { replace: true })
            } catch (error) {
              if (error instanceof AuthError) setFieldError(error.field, error.message)
              else setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="auth-card__form" noValidate>
              <div className="auth-card__fields">
                <TextField name="email" label="Email" type="email" autoComplete="email" />
                <PasswordField name="password" label="Password" autoComplete="current-password" />
              </div>
              {formError && <p className="auth-card__error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                Login
              </button>
              <p className="auth-card__switch text-preset-4">
                Need to create an account?
                <Link to="/signup">Sign Up</Link>
              </p>
            </Form>
          )}
        </Formik>
      </section>
    </AuthLayout>
  )
}
