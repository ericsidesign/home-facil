-- ============================================================================
-- Notification Triggers for Professional App
-- ============================================================================

-- 1. Trigger for Booking Status Changes (e.g., Cancelled)
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_pro_user_id UUID;
BEGIN
  -- We only care if the status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    -- If there's a professional assigned, we notify them
    IF NEW.professional_profile_id IS NOT NULL THEN
      
      -- Get the user_profile_id for this professional
      SELECT user_profile_id INTO v_pro_user_id 
      FROM professional_profiles 
      WHERE id = NEW.professional_profile_id;

      -- If status is CANCELLED
      IF NEW.status = 'CANCELLED' THEN
        INSERT INTO notifications (user_profile_id, type, title, body, channel)
        VALUES (
          v_pro_user_id,
          'BOOKING_CANCELLED',
          'Serviço Cancelado',
          'Infelizmente, um serviço agendado foi cancelado pelo cliente.',
          'IN_APP'
        );
      END IF;
      
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_status_notification ON bookings;
CREATE TRIGGER trg_booking_status_notification
AFTER UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION handle_booking_status_change();


-- 2. Trigger for Payout Status Changes (e.g., Completed or Rejected)
CREATE OR REPLACE FUNCTION handle_payout_status_change()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_pro_user_id UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    -- Get the user_profile_id for this professional
    SELECT user_profile_id INTO v_pro_user_id 
    FROM professional_profiles 
    WHERE id = NEW.professional_profile_id;

    IF NEW.status = 'COMPLETED' THEN
      INSERT INTO notifications (user_profile_id, type, title, body, channel)
      VALUES (
        v_pro_user_id,
        'PAYOUT_COMPLETED',
        'Dinheiro na conta! 🎉',
        'Seu saque de R$ ' || (NEW.amount_cents / 100.0)::numeric(10,2) || ' foi concluído e já deve estar na sua conta.',
        'IN_APP'
      );
    ELSIF NEW.status = 'REJEITADO' THEN
      INSERT INTO notifications (user_profile_id, type, title, body, channel)
      VALUES (
        v_pro_user_id,
        'PAYOUT_REJECTED',
        'Problema com seu saque',
        'Houve um erro ao processar seu saque de R$ ' || (NEW.amount_cents / 100.0)::numeric(10,2) || '. Verifique seus dados bancários.',
        'IN_APP'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payout_status_notification ON payout_requests;
CREATE TRIGGER trg_payout_status_notification
AFTER UPDATE OF status ON payout_requests
FOR EACH ROW
EXECUTE FUNCTION handle_payout_status_change();
