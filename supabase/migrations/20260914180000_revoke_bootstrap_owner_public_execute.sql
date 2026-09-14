-- bootstrap_owner() is service-role only by design (src/lib/auth/bootstrapOwner.ts,
-- "v1 has no self-serve signup") but was still EXECUTE-granted to anon/authenticated
-- by default, making the raw RPC endpoint publicly callable with an arbitrary
-- p_auth_id -- anyone with the public anon key could create venues and attach
-- an owner app_users row to any auth_id of their choosing, with no auth check
-- inside the function itself. Found in the 14 Sep pre-launch security sweep.
revoke execute on function public.bootstrap_owner(uuid, text, text, text, text) from anon, authenticated;
