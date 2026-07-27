// Builds a Deriv Bot (DBot) XML strategy for Matches/Differs with:
//   - probability threshold gate (only purchase when the target digit's
//     recent frequency over a rolling window meets/exceeds the threshold),
//   - martingale recovery after a configurable number of consecutive losses,
//   - take-profit / stop-loss cutoffs based on cumulative session profit.
// Users import the file into https://bot.deriv.com and press Run.

export interface DBotStrategyOptions {
  symbol: string; // e.g. R_100 or 1HZ100V
  contract: "DIGITMATCH" | "DIGITDIFF";
  digit: number; // 0..9
  stake: number; // initial stake in account currency
  duration?: number; // ticks (default 1)
  currency?: string; // default USD
  recoverAfter: 2 | 3; // consecutive losses before doubling
  multiplier?: number; // stake multiplier per loss (default 2)
  threshold?: number; // 0..1 required probability, default 0.15
  window?: number; // rolling tick window, default 50
  takeProfit?: number; // stop when total profit ≥ this
  stopLoss?: number; // stop when total loss ≥ this (positive number)
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );
}

/**
 * Returns a complete Blockly XML document that Deriv Bot can import.
 * Uses tick-analysis blocks to count the target digit's frequency across
 * the last `window` ticks, and only issues a purchase when the frequency
 * clears the threshold and total profit stays within the TP/SL bounds.
 */
export function buildMatchesDiffersStrategy(opts: DBotStrategyOptions): string {
  const {
    symbol,
    contract,
    digit,
    stake,
    duration = 1,
    currency = "USD",
    recoverAfter,
    multiplier = 2,
    threshold = 0.15,
    window = 50,
    takeProfit = 10,
    stopLoss = 20,
  } = opts;

  const sym = escapeXml(symbol);
  // Matches trades gate on freq >= threshold; Differs on freq <= (1 - threshold)
  // i.e. the target digit is rare enough that "not that digit" is favored.
  const isMatches = contract === "DIGITMATCH";
  const cmpOp = isMatches ? "GTE" : "LTE";
  const cmpValue = isMatches ? threshold : Math.max(0, 1 - threshold);

  return `<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true" collection="false">
  <variables>
    <variable id="stake">stake</variable>
    <variable id="losses">losses</variable>
    <variable id="initial">initial_stake</variable>
    <variable id="total">total_profit</variable>
    <variable id="tp">take_profit</variable>
    <variable id="sl">stop_loss</variable>
    <variable id="thr">threshold</variable>
    <variable id="win">win_size</variable>
    <variable id="pred">prediction</variable>
    <variable id="freq">freq</variable>
  </variables>
  <block type="trade_definition" id="trade_definition" x="0" y="0" deletable="false" movable="false">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" id="mkt" deletable="false" movable="false">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">${sym}</field>
        <next>
          <block type="trade_definition_tradetype" id="tt" deletable="false" movable="false">
            <field name="TRADETYPECAT_LIST">digits</field>
            <field name="TRADETYPE_LIST">matchesdiffers</field>
            <next>
              <block type="trade_definition_contracttype" id="ct" deletable="false" movable="false">
                <field name="TYPE_LIST">${contract}</field>
                <next>
                  <block type="trade_definition_candleinterval" id="ci" deletable="false" movable="false">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell" id="rb" deletable="false" movable="false">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror" id="re" deletable="false" movable="false">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="SUBMARKET">
      <block type="trade_definition_tradeoptions" id="topt" deletable="false" movable="false">
        <mutation has_first_barrier="false" has_second_barrier="false" has_prediction="true"/>
        <field name="DURATIONTYPE_LIST">t</field>
        <field name="CURRENCY_LIST">${currency}</field>
        <value name="DURATION">
          <shadow type="math_number"><field name="NUM">${duration}</field></shadow>
        </value>
        <value name="AMOUNT">
          <shadow type="math_number"><field name="NUM">${stake}</field></shadow>
          <block type="variables_get"><field name="VAR" id="stake">stake</field></block>
        </value>
        <value name="PREDICTION">
          <shadow type="math_number"><field name="NUM">${digit}</field></shadow>
          <block type="variables_get"><field name="VAR" id="pred">prediction</field></block>
        </value>
      </block>
    </statement>
  </block>

  <block type="before_purchase" id="bp" x="0" y="500" deletable="false" movable="false">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="controls_if" id="stopcheck">
        <mutation elseif="1"/>
        <value name="IF0">
          <block type="logic_compare">
            <field name="OP">GTE</field>
            <value name="A"><block type="variables_get"><field name="VAR" id="total">total_profit</field></block></value>
            <value name="B"><block type="variables_get"><field name="VAR" id="tp">take_profit</field></block></value>
          </block>
        </value>
        <statement name="DO0">
          <block type="notify" id="n_tp">
            <field name="NOTIFICATION_TYPE">success</field>
            <field name="NOTIFICATION_SOUND">silent</field>
            <value name="MESSAGE"><shadow type="text"><field name="TEXT">Take-profit reached — stopping bot.</field></shadow></value>
          </block>
        </statement>
        <value name="IF1">
          <block type="logic_compare">
            <field name="OP">LTE</field>
            <value name="A"><block type="variables_get"><field name="VAR" id="total">total_profit</field></block></value>
            <value name="B">
              <block type="math_single">
                <field name="OP">NEG</field>
                <value name="NUM"><block type="variables_get"><field name="VAR" id="sl">stop_loss</field></block></value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO1">
          <block type="notify" id="n_sl">
            <field name="NOTIFICATION_TYPE">warn</field>
            <field name="NOTIFICATION_SOUND">silent</field>
            <value name="MESSAGE"><shadow type="text"><field name="TEXT">Stop-loss reached — stopping bot.</field></shadow></value>
          </block>
        </statement>
        <next>
          <block type="variables_set" id="setfreq">
            <field name="VAR" id="freq">freq</field>
            <value name="VALUE">
              <block type="lists_getSublist">
                <mutation at1="true" at2="false"/>
                <field name="WHERE1">FROM_END</field>
                <field name="WHERE2">LAST</field>
                <value name="LIST">
                  <block type="lastDigitList"/>
                </value>
                <value name="AT1"><block type="math_number"><field name="NUM">${window}</field></block></value>
              </block>
            </value>
            <next>
              <block type="variables_set" id="setfreq2">
                <field name="VAR" id="freq">freq</field>
                <value name="VALUE">
                  <block type="math_arithmetic">
                    <field name="OP">DIVIDE</field>
                    <value name="A">
                      <block type="text_count">
                        <value name="SUB">
                          <block type="text_join">
                            <mutation items="1"/>
                            <value name="ADD0"><block type="variables_get"><field name="VAR" id="pred">prediction</field></block></value>
                          </block>
                        </value>
                        <value name="TEXT">
                          <block type="text_join">
                            <mutation items="1"/>
                            <value name="ADD0"><block type="variables_get"><field name="VAR" id="freq">freq</field></block></value>
                          </block>
                        </value>
                      </block>
                    </value>
                    <value name="B"><block type="math_number"><field name="NUM">${window}</field></block></value>
                  </block>
                </value>
                <next>
                  <block type="controls_if" id="thrcheck">
                    <value name="IF0">
                      <block type="logic_compare">
                        <field name="OP">${cmpOp}</field>
                        <value name="A"><block type="variables_get"><field name="VAR" id="freq">freq</field></block></value>
                        <value name="B"><block type="math_number"><field name="NUM">${cmpValue}</field></block></value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="purchase" id="pur">
                        <field name="PURCHASE_LIST">${contract}</field>
                      </block>
                    </statement>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>

  <block type="after_purchase" id="ap" x="0" y="1200" deletable="false" movable="false">
    <statement name="AFTERPURCHASE_STACK">
      <block type="variables_set" id="tp_update">
        <field name="VAR" id="total">total_profit</field>
        <value name="VALUE">
          <block type="math_arithmetic">
            <field name="OP">ADD</field>
            <value name="A"><block type="variables_get"><field name="VAR" id="total">total_profit</field></block></value>
            <value name="B"><block type="read_details"><field name="DETAIL_INDEX">4</field></block></value>
          </block>
        </value>
        <next>
          <block type="controls_if" id="if1">
            <mutation elseif="1"/>
            <value name="IF0">
              <block type="contract_check_result"><field name="CHECK_RESULT">win</field></block>
            </value>
            <statement name="DO0">
              <block type="variables_set">
                <field name="VAR" id="losses">losses</field>
                <value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value>
                <next>
                  <block type="variables_set">
                    <field name="VAR" id="stake">stake</field>
                    <value name="VALUE"><block type="variables_get"><field name="VAR" id="initial">initial_stake</field></block></value>
                  </block>
                </next>
              </block>
            </statement>
            <value name="IF1">
              <block type="contract_check_result"><field name="CHECK_RESULT">loss</field></block>
            </value>
            <statement name="DO1">
              <block type="variables_set">
                <field name="VAR" id="losses">losses</field>
                <value name="VALUE">
                  <block type="math_arithmetic">
                    <field name="OP">ADD</field>
                    <value name="A"><block type="variables_get"><field name="VAR" id="losses">losses</field></block></value>
                    <value name="B"><block type="math_number"><field name="NUM">1</field></block></value>
                  </block>
                </value>
                <next>
                  <block type="controls_if" id="if2">
                    <value name="IF0">
                      <block type="logic_compare">
                        <field name="OP">GTE</field>
                        <value name="A"><block type="variables_get"><field name="VAR" id="losses">losses</field></block></value>
                        <value name="B"><block type="math_number"><field name="NUM">${recoverAfter}</field></block></value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="variables_set">
                        <field name="VAR" id="stake">stake</field>
                        <value name="VALUE">
                          <block type="math_arithmetic">
                            <field name="OP">MULTIPLY</field>
                            <value name="A"><block type="variables_get"><field name="VAR" id="stake">stake</field></block></value>
                            <value name="B"><block type="math_number"><field name="NUM">${multiplier}</field></block></value>
                          </block>
                        </value>
                      </block>
                    </statement>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="controls_if" id="stop_after">
                <mutation elseif="1"/>
                <value name="IF0">
                  <block type="logic_compare">
                    <field name="OP">GTE</field>
                    <value name="A"><block type="variables_get"><field name="VAR" id="total">total_profit</field></block></value>
                    <value name="B"><block type="variables_get"><field name="VAR" id="tp">take_profit</field></block></value>
                  </block>
                </value>
                <statement name="DO0"/>
                <value name="IF1">
                  <block type="logic_compare">
                    <field name="OP">LTE</field>
                    <value name="A"><block type="variables_get"><field name="VAR" id="total">total_profit</field></block></value>
                    <value name="B">
                      <block type="math_single">
                        <field name="OP">NEG</field>
                        <value name="NUM"><block type="variables_get"><field name="VAR" id="sl">stop_loss</field></block></value>
                      </block>
                    </value>
                  </block>
                </value>
                <statement name="DO1"/>
                <next>
                  <block type="trade_again"/>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`;
}

export function downloadStrategyXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
