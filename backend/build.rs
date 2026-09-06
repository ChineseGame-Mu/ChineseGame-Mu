use std::{fs, path::Path};

fn main() {
    println!("cargo:rerun-if-changed=src/guandan_handler.rs");

    // Cleanroom hotfix: after a completed trick is collected, the next leader can
    // be a robot. The normal Play/Pass paths already call run_robot_turns(), but
    // EndRound did not, leaving an empty table stuck on "机器人N".
    let path = Path::new("src/guandan_handler.rs");
    let Ok(mut source) = fs::read_to_string(path) else { return };

    let end_round = "            GuandanClientMessage::EndRound => {\n                let key = match joined_room.clone() {\n                    Some(key) => key,\n                    None => continue,\n                };\n                let result = storage\n";
    let end_round_fixed = "            GuandanClientMessage::EndRound => {\n                let key = match joined_room.clone() {\n                    Some(key) => key,\n                    None => continue,\n                };\n                let hook_to_bottom = hook_to_bottom_for(&key);\n                let result = storage\n";

    if let Some(start) = source.find(end_round) {
        source.replace_range(start..start + end_round.len(), end_round_fixed);
    }

    let Some(end_round_start) = source.find("            GuandanClientMessage::EndRound => {") else { return };
    let reset = "                        state.game.passes = 0;\n                        state.game.trick_complete = false;\n                        state.bump_version();\n";
    let reset_fixed = "                        state.game.passes = 0;\n                        state.game.trick_complete = false;\n                        run_robot_turns(&mut state.game, hook_to_bottom).map_err(|_| ())?;\n                        state.bump_version();\n";
    if let Some(relative) = source[end_round_start..].find(reset) {
        let start = end_round_start + relative;
        source.replace_range(start..start + reset.len(), reset_fixed);
    }

    fs::write(path, source).expect("write cleanroom robot EndRound hotfix");
}
