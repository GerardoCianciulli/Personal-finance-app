import { Form, Formik } from 'formik'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasswordField, TextField } from '../../components/form/fields'
import { AuthError, useAuth } from '../../context/AuthContext'
import { signUpSchema } from '../../validation'
import AuthLayout from './AuthLayout'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')

  return (
    <AuthLayout>
      <section className="auth-card" aria-labelledby="signup-title">
        <h2 className="text-preset-1" id="signup-title">
          Sign Up
        </h2>
        <Formik
          initialValues={{ name: '', email: '', password: '' }}
          validationSchema={signUpSchema}
          onSubmit={async (values, { setFieldError }) => {
            setFormError('')
            try {
              await signUp(values)
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
                <TextField name="name" label="Name" autoComplete="name" />
                <TextField name="email" label="Email" type="email" autoComplete="email" />
                <PasswordField
                  name="password"
                  label="Create Password"
                  autoComplete="new-password"
                  helper="Passwords must be at least 8 characters"
                />
              </div>
              {formError && <p className="auth-card__error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                Create Account
              </button>
              <p className="auth-card__switch text-preset-4">
                Already have an account?
                <Link to="/login">Login</Link>
              </p>
            </Form>
          )}
        </Formik>
      </section>
    </AuthLayout>
  )
}
