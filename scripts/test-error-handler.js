/**
 * Error Handler Testing Script
 * TICKET #016: Verify error handling utilities work correctly
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  DatabaseError,
  asyncHandler,
  validate,
  assert,
  wrapDatabaseError,
  dbTry
} from '../src/utils/errorHandler.js';

console.log('🧪 Testing Error Handler Implementation\n');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: Error class instantiation
console.log('\n📝 Test 1: Error Class Instantiation');
console.log('-'.repeat(60));

test('AppError creates error with custom status', () => {
  const error = new AppError('Test error', 418);
  if (error.statusCode !== 418) throw new Error('Status code not set');
  if (error.message !== 'Test error') throw new Error('Message not set');
  if (!error.isOperational) throw new Error('isOperational not set');
});

test('ValidationError has 422 status', () => {
  const error = new ValidationError('Invalid data', { field: 'name' });
  if (error.statusCode !== 422) throw new Error('Wrong status code');
  if (!error.details.field) throw new Error('Details not preserved');
});

test('NotFoundError has 404 status', () => {
  const error = new NotFoundError('Patient');
  if (error.statusCode !== 404) throw new Error('Wrong status code');
  if (!error.message.includes('Patient')) throw new Error('Resource name not in message');
});

test('UnauthorizedError has 401 status', () => {
  const error = new UnauthorizedError();
  if (error.statusCode !== 401) throw new Error('Wrong status code');
});

test('ForbiddenError has 403 status', () => {
  const error = new ForbiddenError();
  if (error.statusCode !== 403) throw new Error('Wrong status code');
});

test('ConflictError has 409 status', () => {
  const error = new ConflictError('Duplicate entry');
  if (error.statusCode !== 409) throw new Error('Wrong status code');
});

// Test 2: Validate helper
console.log('\n🔍 Test 2: Validate Helper');
console.log('-'.repeat(60));

test('validate() passes when condition is true', () => {
  validate(true, 'Should not throw');
});

test('validate() throws ValidationError when false', () => {
  try {
    validate(false, 'Test validation error');
    throw new Error('Should have thrown');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error('Should throw ValidationError');
    }
    if (error.statusCode !== 422) {
      throw new Error('Should have 422 status');
    }
  }
});

test('validate() includes details in error', () => {
  try {
    validate(false, 'Test error', { field: 'email', value: 'invalid' });
    throw new Error('Should have thrown');
  } catch (error) {
    if (!error.details.field) throw new Error('Details not preserved');
    if (error.details.field !== 'email') throw new Error('Field name wrong');
  }
});

// Test 3: Assert helper
console.log('\n✔️  Test 3: Assert Helper');
console.log('-'.repeat(60));

test('assert() passes when condition is true', () => {
  assert(true, 'Should not throw');
});

test('assert() throws AppError when false', () => {
  try {
    assert(false, 'Test assertion error', 400);
    throw new Error('Should have thrown');
  } catch (error) {
    if (!(error instanceof AppError)) {
      throw new Error('Should throw AppError');
    }
    if (error.statusCode !== 400) {
      throw new Error('Should have 400 status');
    }
  }
});

// Test 4: Database error wrapping
console.log('\n💾 Test 4: Database Error Wrapping');
console.log('-'.repeat(60));

test('wrapDatabaseError() converts unique violation (23505)', () => {
  const dbError = new Error('duplicate key');
  dbError.code = '23505';

  const wrapped = wrapDatabaseError(dbError);

  if (!(wrapped instanceof ConflictError)) {
    throw new Error('Should be ConflictError');
  }
  if (wrapped.statusCode !== 409) {
    throw new Error('Should have 409 status');
  }
});

test('wrapDatabaseError() converts foreign key violation (23503)', () => {
  const dbError = new Error('foreign key');
  dbError.code = '23503';

  const wrapped = wrapDatabaseError(dbError);

  if (!(wrapped instanceof BadRequestError)) {
    throw new Error('Should be BadRequestError');
  }
  if (wrapped.statusCode !== 400) {
    throw new Error('Should have 400 status');
  }
});

test('wrapDatabaseError() converts not null violation (23502)', () => {
  const dbError = new Error('not null');
  dbError.code = '23502';

  const wrapped = wrapDatabaseError(dbError);

  if (!(wrapped instanceof ValidationError)) {
    throw new Error('Should be ValidationError');
  }
  if (wrapped.statusCode !== 422) {
    throw new Error('Should have 422 status');
  }
});

test('wrapDatabaseError() converts unknown errors to DatabaseError', () => {
  const dbError = new Error('unknown error');
  dbError.code = 'UNKNOWN';

  const wrapped = wrapDatabaseError(dbError);

  if (!(wrapped instanceof DatabaseError)) {
    throw new Error('Should be DatabaseError');
  }
  if (wrapped.statusCode !== 500) {
    throw new Error('Should have 500 status');
  }
});

// Test 5: dbTry helper
console.log('\n🔄 Test 5: dbTry Helper');
console.log('-'.repeat(60));

test('dbTry() returns result on success', async () => {
  const result = await dbTry(() => Promise.resolve({ data: 'success' }));
  if (result.data !== 'success') {
    throw new Error('Should return result');
  }
});

test('dbTry() wraps database errors', async () => {
  try {
    await dbTry(() => {
      const error = new Error('duplicate');
      error.code = '23505';
      return Promise.reject(error);
    });
    throw new Error('Should have thrown');
  } catch (error) {
    if (!(error instanceof ConflictError)) {
      throw new Error('Should wrap to ConflictError');
    }
  }
});

// Test 6: asyncHandler
console.log('\n⚡ Test 6: asyncHandler Wrapper');
console.log('-'.repeat(60));

test('asyncHandler() wraps async function', () => {
  const wrapped = asyncHandler(async (req, reply) => {
    return { data: 'test' };
  });

  if (typeof wrapped !== 'function') {
    throw new Error('Should return function');
  }
});

test('asyncHandler() catches and handles errors', async () => {
  const mockRequest = {
    log: {
      error: () => {},
      warn: () => {}
    },
    user: { id: 'test-user' },
    url: '/test',
    method: 'GET'
  };

  const mockReply = {
    code: function(status) {
      this.statusCode = status;
      return this;
    },
    send: function(data) {
      this.sentData = data;
      return this;
    }
  };

  const handler = asyncHandler(async (request, reply) => {
    throw new NotFoundError('Test resource');
  });

  await handler(mockRequest, mockReply);

  if (mockReply.statusCode !== 404) {
    throw new Error('Should set 404 status');
  }
  if (!mockReply.sentData) {
    throw new Error('Should send error response');
  }
  if (!mockReply.sentData.trackingId) {
    throw new Error('Should include tracking ID');
  }
});

// Test 7: Error inheritance chain
console.log('\n🔗 Test 7: Error Inheritance');
console.log('-'.repeat(60));

test('All custom errors extend AppError', () => {
  const errors = [
    new ValidationError('test'),
    new NotFoundError('test'),
    new UnauthorizedError(),
    new ForbiddenError(),
    new BadRequestError(),
    new ConflictError(),
    new DatabaseError()
  ];

  for (const error of errors) {
    if (!(error instanceof AppError)) {
      throw new Error(`${error.constructor.name} should extend AppError`);
    }
    if (!(error instanceof Error)) {
      throw new Error(`${error.constructor.name} should extend Error`);
    }
  }
});

test('All custom errors have isOperational flag', () => {
  const errors = [
    new ValidationError('test'),
    new NotFoundError('test'),
    new UnauthorizedError(),
    new ForbiddenError()
  ];

  for (const error of errors) {
    if (!error.isOperational) {
      throw new Error(`${error.constructor.name} should have isOperational=true`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Error handler is working correctly.');
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review errors above.`);
  process.exit(1);
}

console.log('\n✅ Error Handler Implementation: VERIFIED');
console.log('\n📚 See TICKET_016_ERROR_HANDLING_MIGRATION_GUIDE.md for usage examples');
