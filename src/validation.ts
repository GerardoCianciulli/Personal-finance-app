import * as Yup from 'yup'
import { CATEGORIES, INCOME_FREQUENCIES, POT_NAME_MAX_LENGTH, THEMES } from './constants'

export const REQUIRED = "Can't be empty"

/** name@domain.suffix, e.g. jane@mail.com, jane@uni.ac.it */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

const countWords = (value = '') => value.trim().split(/\s+/).filter(Boolean).length

/** Money input: empty string counts as missing, anything else must be a number */
const money = () =>
  Yup.number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .typeError('Must be a number')
    .required(REQUIRED)
    .test('cents', 'Use at most 2 decimals', (value) => value === undefined || Number.isInteger(Math.round(value * 1e6) / 1e4))

const positiveMoney = () => money().moreThan(0, 'Must be more than $0')

const themeValues = THEMES.map((t) => t.hex)

export const loginSchema = Yup.object({
  email: Yup.string().trim().required(REQUIRED).matches(EMAIL_PATTERN, 'Enter a valid email, e.g. name@domain.com'),
  password: Yup.string().required(REQUIRED),
})

export const signUpSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required(REQUIRED)
    .test('min-words', 'Enter at least two words', (value) => countWords(value) >= 2)
    .test('max-words', 'Use fewer than five words', (value) => countWords(value) < 5),
  email: Yup.string().trim().required(REQUIRED).matches(EMAIL_PATTERN, 'Enter a valid email, e.g. name@domain.com'),
  password: Yup.string()
    .required(REQUIRED)
    .min(8, 'Passwords must be at least 8 characters')
    .matches(/[A-Z]/, 'Include an uppercase letter')
    .matches(/[a-z]/, 'Include a lowercase letter')
    .matches(/[^A-Za-z0-9\s]/, 'Include a special character'),
})

export const budgetSchema = Yup.object({
  category: Yup.string().required(REQUIRED).oneOf([...CATEGORIES], 'Choose a category'),
  maximum: positiveMoney(),
  theme: Yup.string().required(REQUIRED).oneOf(themeValues, 'Choose a theme'),
})

export const potSchema = Yup.object({
  name: Yup.string().trim().required(REQUIRED).max(POT_NAME_MAX_LENGTH, `Use ${POT_NAME_MAX_LENGTH} characters or fewer`),
  target: positiveMoney(),
  theme: Yup.string().required(REQUIRED).oneOf(themeValues, 'Choose a theme'),
})

export const potMoneySchema = (max: number, overMessage: string) =>
  Yup.object({
    amount: positiveMoney().max(max, overMessage),
  })

export const billSchema = Yup.object({
  name: Yup.string().trim().required(REQUIRED).max(40, 'Use 40 characters or fewer'),
  dueDate: Yup.string().required(REQUIRED),
  amount: positiveMoney(),
})

export const transactionSchema = Yup.object({
  name: Yup.string().trim().required(REQUIRED).max(40, 'Use 40 characters or fewer'),
  category: Yup.string().required(REQUIRED).oneOf([...CATEGORIES], 'Choose a category'),
  date: Yup.string().required(REQUIRED),
  type: Yup.string().required(REQUIRED).oneOf(['deposit', 'debit'], 'Choose Deposit or Debit'),
  // Deposits bring money in (above $0), debits take money out (below $0)
  amount: money().when('type', ([type], schema) => {
    if (type === 'deposit') return schema.moreThan(0, 'A deposit must be above $0')
    if (type === 'debit') return schema.lessThan(0, 'A debit must be below $0, e.g. -25.50')
    return schema.test('not-zero', 'Amount can’t be $0', (value) => value !== 0)
  }),
})

export const incomesSchema = Yup.object({
  incomes: Yup.array().of(
    Yup.object({
      amount: positiveMoney(),
      frequency: Yup.string()
        .required(REQUIRED)
        .oneOf(
          INCOME_FREQUENCIES.map((f) => f.value),
          'Choose a frequency',
        ),
      firstPaymentDate: Yup.string()
        .required(REQUIRED)
        .matches(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
    }),
  ),
})
