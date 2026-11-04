import setup from '../../tests/e2e/runtime-art-review-setup.js';
const stop = await setup();
console.log(
  'Production-renderer artwork review: http://127.0.0.1:' +
    process.env['VOLAM_QA_CLIENT_PORT'] +
    '/?debug=1&runtimeArtReview=1',
);
process.once('SIGINT', () => {
  void stop().then(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void stop().then(() => process.exit(0));
});
