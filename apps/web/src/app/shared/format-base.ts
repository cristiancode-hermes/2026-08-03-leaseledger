import {
  eur,
  dateFmt,
  monthLabel,
  paymentTone,
  paymentLabel,
  unitTone,
  leaseTone,
  maintTone,
  priorityTone,
} from './format';

/**
 * Template-scope bridge: Angular templates can only reference component
 * members, so pages extend this base to expose the pure format helpers.
 */
export abstract class FormatBase {
  readonly eur = eur;
  readonly dateFmt = dateFmt;
  readonly monthLabel = monthLabel;
  readonly paymentTone = paymentTone;
  readonly paymentLabel = paymentLabel;
  readonly unitTone = unitTone;
  readonly leaseTone = leaseTone;
  readonly maintTone = maintTone;
  readonly priorityTone = priorityTone;
}
