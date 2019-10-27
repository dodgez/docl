# This code computes the first 50 Fibonacci numbers

mov eax, 1
mov ebx, 1
mov ecx, 50
push ecx
mov esi, 0

lbl loop:
  mov dword [esi], eax
  push ebx
  push eax
  call next
  pop ebx
  pop eax
  add esi, 4
  sub ecx, 1
  cmp ecx, 0
  jle done
  jmp loop

lbl next:
  push ebp
  mov ebp, esp
  mov eax, dword [ebp + 8]
  mov ebx, dword [ebp + 12]
  add eax, ebx
  mov dword [ebp + 12], ebx
  mov dword [ebp + 8], eax
  pop ebp
  ret

lbl done:
  mov esi, 0
  pop eax
  mov edx, 2
  int 1
  hlt
