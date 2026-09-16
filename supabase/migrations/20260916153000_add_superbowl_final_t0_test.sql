-- TEST ONLY: persistent T0 for the administrative T+72 hold after the Super Bowl.
-- T0 is the first instant REDZONE detects the Super Bowl as STATUS_FINAL.
-- It is deliberately independent from CAMPEON_REDZONE/conseguido_at.

alter table public.app_config_test
  add column if not exists superbowl_final_t0 timestamptz;

alter table public.app_config_test
  add column if not exists superbowl_final_t0_temporada integer;

comment on column public.app_config_test.superbowl_final_t0 is
  'TEST: instante T0 de la primera deteccion de la Super Bowl en STATUS_FINAL; gobierna T+72 antes de fase_competicion=finalizada.';

comment on column public.app_config_test.superbowl_final_t0_temporada is
  'TEST: temporada a la que pertenece superbowl_final_t0; evita reutilizar un T0 de una temporada anterior.';
