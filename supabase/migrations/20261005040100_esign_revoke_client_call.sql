-- E-signature stamp, PART 2 of 2 (hardening-2 task 2). NOT YET APPLIED to the shared database.
-- APPLY ONLY AFTER the new complete-signature route (which calls record_onboarding_signature with the service role) is on
-- main and deployed to production. Applying it earlier breaks the signature step of the code that is live today, because
-- that code calls complete_onboarding_signature as the signed in user.
-- Effect: clients can no longer call the old function with caller supplied ip and device. The function itself is kept
-- (nothing is dropped); service_role keeps execute.
--
-- ROLLBACK:
--   grant execute on function public.complete_onboarding_signature(text, text, text) to authenticated;

revoke execute on function public.complete_onboarding_signature(text, text, text) from public, anon, authenticated;
