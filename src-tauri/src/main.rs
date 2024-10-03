// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn differential<F: Fn(f64) -> f64>(funtion: F) -> impl Fn(f64) -> f64 {
    // 이 함수는 무려 인자로 들어온 함수의 도함수(클로저)를 뱉어냄
    //                       f(x + dx) - f(x - dx)
    //                lim    _____________________
    //              dx -> 0           2dx
    move |x: f64| {
        (funtion(x + 2.3283064365386962890625e-10 /* dx = 2^-32 */)
            - funtion(x - 2.32830643653869628906255e-10 /* dx = 2^-32 */))
            * 2147483648.0
    } /* 1/2dx = 2^31 / 2 */
}

// 얘도 같은 알고리즘으로 짰는데 Xn이랑 X(n+1)을 미리 계산된 값을 복사하는, 쪼오끔 효율적인 방법을 써서
// 요놈이 쪼오끔 더 빠름. 어썸하다.
fn integral<F>(funtion: F, to: f64, from: f64) -> f64
where
    F: Fn(f64) -> f64,
{
    //사다리꼴 수치적분
    //sigma dx * (f(Xn) + f(X(n+1))) / 2

    if from == to {
        return 0.0;
    }

    let len: f64 = to - from;
    let mut result: f64 = 0.0;

    let dx: f64 = len * 9.5367431640625e-7;
    let mut x_n = from;
    let mut x_n1 = x_n + dx;
    let mut Fx: f64 = funtion(from);
    let mut Fx_1: f64;
    for _ in 0..1048576 {
        Fx_1 = funtion(x_n1);
        result += 0.5 * dx * { Fx + Fx_1 };
        // dx도 나중에 곱하곤 싶은데 그러면 오버플로우 날 것 같음ㅇㅇ
        x_n = x_n1;
        x_n1 = x_n + dx;
        //생각해보니 함수값도 계속 두번씩 계산할 필요 없잖아 -> 7.808s
        Fx = Fx_1;
    }
    result
}

#[tauri::command]
async fn inte_sin(to: f64, from: f64) -> f64 {
    return integral(f64::sin, to, from);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
          inte_sin
          // etc...
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
